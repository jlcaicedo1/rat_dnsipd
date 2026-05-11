import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActividadActivosService } from './actividad-activos.service';
import { LinkActivoDto } from './dto/link-activo.dto';

@Controller()
export class ActividadActivosController {
  constructor(
    private readonly actividadActivosService: ActividadActivosService,
  ) {}

  @Get('actividad-versiones/:actividadVersionId/activos')
  @UseGuards(JwtAuthGuard)
  findAll(
    @Param('actividadVersionId', ParseIntPipe) actividadVersionId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actividadActivosService.findAll(actividadVersionId, user);
  }

  @Post('actividad-versiones/:actividadVersionId/activos')
  @UseGuards(JwtAuthGuard)
  create(
    @Param('actividadVersionId', ParseIntPipe) actividadVersionId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LinkActivoDto,
  ) {
    return this.actividadActivosService.create(actividadVersionId, dto, user);
  }

  @Delete('actividad-versiones/:actividadVersionId/activos/:activoId')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('actividadVersionId', ParseIntPipe) actividadVersionId: number,
    @Param('activoId', ParseIntPipe) activoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actividadActivosService.remove(actividadVersionId, activoId, user);
  }
}
