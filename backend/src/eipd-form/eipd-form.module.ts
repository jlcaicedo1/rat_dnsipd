import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EipdFormController } from './eipd-form.controller';
import { EipdFormService } from './eipd-form.service';

@Module({
  imports: [PrismaModule, AuthModule, NotificacionesModule],
  controllers: [EipdFormController],
  providers: [EipdFormService],
})
export class EipdFormModule {}
