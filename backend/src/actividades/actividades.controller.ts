import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActividadesService } from './actividades.service';
import { ArchiveActividadDto } from './dto/archive-actividad.dto';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { QueryActividadDto } from './dto/query-actividad.dto';
import { UpdateActividadDto } from './dto/update-actividad.dto';

@Controller()
export class ActividadesController {
  constructor(private readonly actividadesService: ActividadesService) {}

  @Get('actividades')
  findAll(@Query() query: QueryActividadDto) {
    return this.actividadesService.findAll(query);
  }

  @Get('actividades/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.actividadesService.findOne(id);
  }

  @Post('rats/:ratId/actividades')
  @UseGuards(JwtAuthGuard)
  create(
    @Param('ratId', ParseIntPipe) ratId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateActividadDto,
  ) {
    return this.actividadesService.create(ratId, dto, user);
  }

  @Patch('actividades/:id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateActividadDto,
  ) {
    return this.actividadesService.update(id, dto, user);
  }

  @Patch('actividades/:id/archive')
  @UseGuards(JwtAuthGuard)
  archive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ArchiveActividadDto,
  ) {
    return this.actividadesService.archive(id, dto, user);
  }

  @Get('actividades/:id/versiones')
  findVersiones(@Param('id', ParseIntPipe) id: number) {
    return this.actividadesService.findVersiones(id);
  }

  @Get('actividades/:id/detail')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.actividadesService.detail(id);
  }
}
