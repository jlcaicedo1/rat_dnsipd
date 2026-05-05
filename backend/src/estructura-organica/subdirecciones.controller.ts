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
import { SubdireccionesService } from './subdirecciones.service';
import { CreateSubdireccionDto } from './dto/create-subdireccion.dto';
import { UpdateSubdireccionDto } from './dto/update-subdireccion.dto';

@Controller('subdirecciones')
@UseGuards(JwtAuthGuard)
export class SubdireccionesController {
  constructor(private readonly subdireccionesService: SubdireccionesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('dependenciaId') dependenciaId?: string,
    @Query('activo') activo?: string,
    @Query('search') search?: string,
  ) {
    return this.subdireccionesService.findAll({
      dependenciaId: dependenciaId ? Number(dependenciaId) : undefined,
      activo: activo === undefined ? undefined : activo === 'true',
      search,
    }, user);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.subdireccionesService.findOne(id, user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubdireccionDto,
  ) {
    return this.subdireccionesService.create(dto, user);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubdireccionDto,
  ) {
    return this.subdireccionesService.update(id, dto, user);
  }

  @Get(':id/rats')
  findRats(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.subdireccionesService.findRats(id, user);
  }
}
