import {
  Controller, Get, Post, Param, Query, Body,
  UseGuards, Request,
} from '@nestjs/common';
import { CircularesService } from './circulares.service';
import { CreateCircularDto } from './dto/create-circular.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('circulares')
@UseGuards(AuthGuard('jwt'))
export class CircularesController {
  constructor(private readonly circularesService: CircularesService) {}

  @Post()
  @Roles('Admin', 'Secretaria', 'Director')
  async create(@Body() dto: CreateCircularDto, @Request() req) {
    return this.circularesService.create(dto, req.user.userId);
  }

  @Get()
  @Roles('Admin', 'Secretaria', 'Director')
  async findAll(@Query('page') page = '1', @Query('limit') limit = '10') {
    return this.circularesService.findAll(Number(page), Number(limit));
  }

  @Get('count')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Admin', 'Secretaria', 'Director')
async getTotalCirculares() {
  return this.circularesService.getTotalCirculares();
}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.circularesService.findOne(Number(id));
  }

}
