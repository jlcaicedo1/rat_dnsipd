import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ActividadesController } from './actividades.controller';
import { ActividadesService } from './actividades.service';

@Module({
  imports: [AuthModule],
  controllers: [ActividadesController],
  providers: [ActividadesService],
  exports: [ActividadesService],
})
export class ActividadesModule {}
