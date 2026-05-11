import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RiesgosController } from './riesgos.controller';
import { RiesgosService } from './riesgos.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RiesgosController],
  providers: [RiesgosService],
})
export class RiesgosModule {}
