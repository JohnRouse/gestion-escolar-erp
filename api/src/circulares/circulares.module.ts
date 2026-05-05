import { Module } from '@nestjs/common';
import { CircularesService } from './circulares.service';
import { CircularesController } from './circulares.controller';

@Module({
  providers: [CircularesService],
  controllers: [CircularesController],
})
export class CircularesModule {}