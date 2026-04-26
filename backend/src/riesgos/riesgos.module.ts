import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RiesgosController } from './riesgos.controller';
import { RiesgosService } from './riesgos.service';

@Module({
  imports: [PrismaModule],
  controllers: [RiesgosController],
  providers: [RiesgosService],
})
export class RiesgosModule {}
