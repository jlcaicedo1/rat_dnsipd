import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ActividadVersionesController } from './actividad-versiones.controller';
import { ActividadVersionesService } from './actividad-versiones.service';

@Module({
  imports: [AuthModule],
  controllers: [ActividadVersionesController],
  providers: [ActividadVersionesService],
  exports: [ActividadVersionesService],
})
export class ActividadVersionesModule {}
