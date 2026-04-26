import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AlertasService } from './alertas.service';

@Controller()
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  @Get('actividad-versiones/:id/alertas')
  findByActividadVersion(@Param('id', ParseIntPipe) id: number) {
    return this.alertasService.findByActividadVersion(id);
  }

  @Get('rats/:id/alertas')
  findByRat(@Param('id', ParseIntPipe) id: number) {
    return this.alertasService.findByRat(id);
  }
}
