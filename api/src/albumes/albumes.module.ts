import { Module } from '@nestjs/common';
import { AlbumesService } from './albumes.service';
import { AlbumesController } from './albumes.controller';

@Module({
  controllers: [AlbumesController],
  providers: [AlbumesService],
  exports: [AlbumesService],
})
export class AlbumesModule {}