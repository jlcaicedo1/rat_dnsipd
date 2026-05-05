import {
  Body,
  Controller,
  Delete,
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
import { ActivosService } from './activos.service';
import { CreateActivoDto } from './dto/create-activo.dto';
import { QueryActivoDto } from './dto/query-activo.dto';
import { UpdateActivoDto } from './dto/update-activo.dto';

@Controller()
export class ActivosController {
  constructor(private readonly activosService: ActivosService) {}

  @Get('activos')
  @UseGuards(JwtAuthGuard)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryActivoDto,
  ) {
    return this.activosService.findAll(query, user);
  }

  @Get('activos/:id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activosService.findOne(id, user);
  }

  @Post('activos')
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateActivoDto) {
    return this.activosService.create(dto, user);
  }

  @Patch('activos/:id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateActivoDto,
  ) {
    return this.activosService.update(id, dto, user);
  }

  @Patch('activos/:id/disable')
  @UseGuards(JwtAuthGuard)
  disable(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activosService.disable(id, user);
  }

  @Delete('activos/:id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activosService.disable(id, user);
  }

  @Get('activos/:id/actividad-versiones')
  @UseGuards(JwtAuthGuard)
  findActividadVersiones(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activosService.findActividadVersiones(id, user);
  }
}
