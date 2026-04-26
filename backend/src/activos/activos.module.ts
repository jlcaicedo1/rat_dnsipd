import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivosController } from './activos.controller';
import { ActivosService } from './activos.service';

@Module({
  imports: [PrismaModule],
  controllers: [ActivosController],
  providers: [ActivosService],
  exports: [ActivosService],
})
export class ActivosModule {}
