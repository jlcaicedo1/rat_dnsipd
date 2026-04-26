import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertasController } from './alertas.controller';
import { AlertasService } from './alertas.service';

@Module({
  imports: [PrismaModule],
  controllers: [AlertasController],
  providers: [AlertasService],
})
export class AlertasModule {}
