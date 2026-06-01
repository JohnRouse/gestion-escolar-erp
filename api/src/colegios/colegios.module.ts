import { Module } from '@nestjs/common';
import { ColegiosController } from './colegios.controller';
import { ColegiosService } from './colegios.service';

@Module({
  controllers: [ColegiosController],
  providers: [ColegiosService],
})
export class ColegiosModule {}