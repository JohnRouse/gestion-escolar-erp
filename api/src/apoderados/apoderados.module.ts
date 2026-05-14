import { Module } from '@nestjs/common';
import { ApoderadosController } from './apoderados.controller';
import { ApoderadosService } from './apoderados.service';

@Module({
  controllers: [ApoderadosController],
  providers: [ApoderadosService],
  exports: [ApoderadosService],
})
export class ApoderadosModule {}