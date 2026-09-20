import { Module } from '@nestjs/common';
import { CitasService } from './citas.service';
import { CitasController } from './citas.controller';
import { CitasPortalController } from './citas-portal.controller';

@Module({
  controllers: [CitasPortalController, CitasController],
  providers: [CitasService],
  exports: [CitasService],
})
export class CitasModule {}
