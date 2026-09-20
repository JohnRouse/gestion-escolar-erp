import { Module } from '@nestjs/common';
import { CircularesService } from './circulares.service';
import { CircularesController } from './circulares.controller';
import { CircularesPadresController } from './circulares-padres.controller';

@Module({
  providers: [CircularesService],
  controllers: [CircularesPadresController, CircularesController],
})
export class CircularesModule {}
