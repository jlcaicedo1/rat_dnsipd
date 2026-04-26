import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRiesgoDto } from './dto/create-riesgo.dto';
import { UpdateRiesgoDto } from './dto/update-riesgo.dto';
import { RiesgosService } from './riesgos.service';

@Controller()
export class RiesgosController {
  constructor(private readonly riesgosService: RiesgosService) {}

  @Get('actividad-versiones/:actividadVersionId/riesgos')
  findByActividadVersion(
    @Param('actividadVersionId', ParseIntPipe) actividadVersionId: number,
  ) {
    return this.riesgosService.findByActividadVersion(actividadVersionId);
  }

  @Post('actividad-versiones/:actividadVersionId/riesgos')
  @UseGuards(JwtAuthGuard)
  create(
    @Param('actividadVersionId', ParseIntPipe) actividadVersionId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRiesgoDto,
  ) {
    return this.riesgosService.create(actividadVersionId, dto, user);
  }

  @Get('riesgos/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.riesgosService.findOne(id);
  }

  @Patch('riesgos/:id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRiesgoDto,
  ) {
    return this.riesgosService.update(id, dto, user);
  }

  @Delete('riesgos/:id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.riesgosService.remove(id, user);
  }
}
