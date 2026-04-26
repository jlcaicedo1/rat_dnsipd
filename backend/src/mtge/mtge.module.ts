import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MtgeController } from './mtge.controller';
import { MtgeService } from './mtge.service';

@Module({
  imports: [PrismaModule],
  controllers: [MtgeController],
  providers: [MtgeService],
})
export class MtgeModule {}
