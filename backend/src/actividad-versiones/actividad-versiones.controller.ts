import {
  Body,
  Controller,
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
import { ActividadVersionesService } from './actividad-versiones.service';
import { CreateActividadVersionDto } from './dto/create-actividad-version.dto';
import { TransitionCommentDto } from './dto/transition-comment.dto';
import { UpdateActividadVersionDto } from './dto/update-actividad-version.dto';

@Controller()
export class ActividadVersionesController {
  constructor(
    private readonly actividadVersionesService: ActividadVersionesService,
  ) {}

  @Post('actividades/:actividadId/versiones')
  @UseGuards(JwtAuthGuard)
  create(
    @Param('actividadId', ParseIntPipe) actividadId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateActividadVersionDto,
  ) {
    return this.actividadVersionesService.create(actividadId, dto, user);
  }

  @Get('actividad-versiones/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.actividadVersionesService.findOne(id);
  }

  @Get('actividad-versiones/:id/full')
  findFull(@Param('id', ParseIntPipe) id: number) {
    return this.actividadVersionesService.findFull(id);
  }

  @Get('actividad-versiones/:id/observaciones')
  findObservaciones(@Param('id', ParseIntPipe) id: number) {
    return this.actividadVersionesService.findObservaciones(id);
  }

  @Patch('actividad-versiones/:id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateActividadVersionDto,
  ) {
    return this.actividadVersionesService.update(id, dto, user);
  }

  @Post('actividad-versiones/:id/submit-review')
  @UseGuards(JwtAuthGuard)
  submitReview(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actividadVersionesService.submitReview(id, user);
  }

  @Post('actividad-versiones/:id/observe')
  @UseGuards(JwtAuthGuard)
  observe(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TransitionCommentDto,
  ) {
    return this.actividadVersionesService.observe(id, dto, user);
  }

  @Post('actividad-versiones/:id/subsanar')
  @UseGuards(JwtAuthGuard)
  subsanar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TransitionCommentDto,
  ) {
    return this.actividadVersionesService.subsanar(id, dto, user);
  }

  @Post('actividad-versiones/:id/approve')
  @UseGuards(JwtAuthGuard)
  approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actividadVersionesService.approve(id, user);
  }

  @Post('actividad-versiones/:id/set-current')
  @UseGuards(JwtAuthGuard)
  setCurrent(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actividadVersionesService.setCurrent(id, user);
  }

  @Post('actividad-versiones/:id/archive')
  @UseGuards(JwtAuthGuard)
  archive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actividadVersionesService.archive(id, user);
  }
}
