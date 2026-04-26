import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EipdController } from './eipd.controller';
import { EipdService } from './eipd.service';

@Module({
  imports: [PrismaModule],
  controllers: [EipdController],
  providers: [EipdService],
})
export class EipdModule {}
