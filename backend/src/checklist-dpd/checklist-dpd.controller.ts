import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateChecklistDpdDto } from './dto/create-checklist-dpd.dto';
import { UpsertChecklistDpdDto } from './dto/upsert-checklist-dpd.dto';
import { ChecklistDpdService } from './checklist-dpd.service';

@Controller('checklist-dpd')
@UseGuards(JwtAuthGuard)
export class ChecklistDpdController {
  constructor(private readonly service: ChecklistDpdService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateChecklistDpdDto) {
    return this.service.create(dto, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertChecklistDpdDto,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.service.softDelete(id, user);
  }
}
