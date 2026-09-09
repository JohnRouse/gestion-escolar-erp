import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { StaffListDto, StaffScopeDto, StaffWriteDto } from './staff.dto';
import { STAFF_MANAGEMENT_ROLES, StaffService } from './staff.service';

type StaffRequest = Request & { user: { userId: number } };
@Controller('staff')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(...STAFF_MANAGEMENT_ROLES)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class StaffController {
  constructor(private readonly staff: StaffService) {}
  @Get() list(@Req() req: StaffRequest, @Query() query: StaffListDto) {
    return this.staff.list(req.user.userId, query);
  }
  @Get('personas/:dni') lookup(
    @Req() req: StaffRequest,
    @Query() query: StaffScopeDto,
    @Param('dni') dni: string,
  ) {
    return this.staff.lookup(req.user.userId, query, dni);
  }
  @Get(':id') detail(
    @Req() req: StaffRequest,
    @Query() query: StaffScopeDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.staff.detail(req.user.userId, query, id);
  }
  @Post() create(
    @Req() req: StaffRequest,
    @Query() query: StaffScopeDto,
    @Body() body: StaffWriteDto,
  ) {
    return this.staff.save(req.user.userId, query, body);
  }
  @Put(':id') update(
    @Req() req: StaffRequest,
    @Query() query: StaffScopeDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: StaffWriteDto,
  ) {
    return this.staff.save(req.user.userId, query, body, id);
  }
}
