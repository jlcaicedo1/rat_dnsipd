import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DependenciasService } from './dependencias.service';
import { CreateDependenciaDto } from './dto/create-dependencia.dto';
import { UpdateDependenciaDto } from './dto/update-dependencia.dto';

@Controller('dependencias')
export class DependenciasController {
  constructor(private readonly dependenciasService: DependenciasService) {}

  @Get()
  findAll(
    @Query('tipoProcesoId') tipoProcesoId?: string,
    @Query('activo') activo?: string,
    @Query('search') search?: string,
  ) {
    return this.dependenciasService.findAll({
      tipoProcesoId: tipoProcesoId ? Number(tipoProcesoId) : undefined,
      activo: activo === undefined ? undefined : activo === 'true',
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dependenciasService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDependenciaDto) {
    return this.dependenciasService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDependenciaDto,
  ) {
    return this.dependenciasService.update(id, dto);
  }

  @Get(':id/subdirecciones')
  findSubdirecciones(@Param('id', ParseIntPipe) id: number) {
    return this.dependenciasService.findSubdirecciones(id);
  }

  @Get(':id/rats')
  findRats(@Param('id', ParseIntPipe) id: number) {
    return this.dependenciasService.findRats(id);
  }
}
