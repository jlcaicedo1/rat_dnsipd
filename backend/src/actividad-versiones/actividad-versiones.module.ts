import { Module } from '@nestjs/common';
import { ActividadVersionesController } from './actividad-versiones.controller';
import { ActividadVersionesService } from './actividad-versiones.service';

@Module({
  controllers: [ActividadVersionesController],
  providers: [ActividadVersionesService],
  exports: [ActividadVersionesService],
})
export class ActividadVersionesModule {}
