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
import { DependenciasService } from './dependencias.service';
import { CreateDependenciaDto } from './dto/create-dependencia.dto';
import { UpdateDependenciaDto } from './dto/update-dependencia.dto';

@Controller('dependencias')
@UseGuards(JwtAuthGuard)
export class DependenciasController {
  constructor(private readonly dependenciasService: DependenciasService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('tipoProcesoId') tipoProcesoId?: string,
    @Query('activo') activo?: string,
    @Query('search') search?: string,
  ) {
    return this.dependenciasService.findAll({
      tipoProcesoId: tipoProcesoId ? Number(tipoProcesoId) : undefined,
      activo: activo === undefined ? undefined : activo === 'true',
      search,
    }, user);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.dependenciasService.findOne(id, user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDependenciaDto,
  ) {
    return this.dependenciasService.create(dto, user);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDependenciaDto,
  ) {
    return this.dependenciasService.update(id, dto, user);
  }

  @Get(':id/subdirecciones')
  findSubdirecciones(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.dependenciasService.findSubdirecciones(id, user);
  }

  @Get(':id/rats')
  findRats(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.dependenciasService.findRats(id, user);
  }
}
