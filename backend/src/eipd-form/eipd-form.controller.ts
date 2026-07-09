import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateEipdFormDto } from './dto/create-eipd-form.dto';
import { UpsertEipdFormDto } from './dto/upsert-eipd-form.dto';
import { EipdFormService } from './eipd-form.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class EipdFormController {
  constructor(private readonly service: EipdFormService) {}

  @Get('eipd-form')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  @Post('eipd-form')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEipdFormDto) {
    return this.service.create(dto, user);
  }

  @Get('eipd-form/mine')
  findOrCreateMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findOrCreateMine(user);
  }

  @Get('eipd-form/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  @Patch('eipd-form/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertEipdFormDto,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete('eipd-form/:id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.service.softDelete(id, user);
  }

  @Get('actividad-versiones/:actividadVersionId/eipd-form')
  findByActividadVersion(
    @Param('actividadVersionId', ParseIntPipe) actividadVersionId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findByActividadVersion(actividadVersionId, user);
  }
}
