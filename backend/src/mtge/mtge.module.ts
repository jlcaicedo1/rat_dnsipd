import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MtgeController } from './mtge.controller';
import { MtgeService } from './mtge.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MtgeController],
  providers: [MtgeService],
})
export class MtgeModule {}
