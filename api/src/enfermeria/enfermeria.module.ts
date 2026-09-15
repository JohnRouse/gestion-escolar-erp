import { Module } from '@nestjs/common';
import { EnfermeriaController } from './enfermeria.controller';
import { EnfermeriaService } from './enfermeria.service';

@Module({
  controllers: [EnfermeriaController],
  providers: [EnfermeriaService],
})
export class EnfermeriaModule {}
