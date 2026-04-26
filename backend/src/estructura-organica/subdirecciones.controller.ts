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
import { SubdireccionesService } from './subdirecciones.service';
import { CreateSubdireccionDto } from './dto/create-subdireccion.dto';
import { UpdateSubdireccionDto } from './dto/update-subdireccion.dto';

@Controller('subdirecciones')
export class SubdireccionesController {
  constructor(private readonly subdireccionesService: SubdireccionesService) {}

  @Get()
  findAll(
    @Query('dependenciaId') dependenciaId?: string,
    @Query('activo') activo?: string,
    @Query('search') search?: string,
  ) {
    return this.subdireccionesService.findAll({
      dependenciaId: dependenciaId ? Number(dependenciaId) : undefined,
      activo: activo === undefined ? undefined : activo === 'true',
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subdireccionesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSubdireccionDto) {
    return this.subdireccionesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubdireccionDto,
  ) {
    return this.subdireccionesService.update(id, dto);
  }

  @Get(':id/rats')
  findRats(@Param('id', ParseIntPipe) id: number) {
    return this.subdireccionesService.findRats(id);
  }
}
