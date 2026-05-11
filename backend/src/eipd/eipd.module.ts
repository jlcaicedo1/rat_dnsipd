import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EipdController } from './eipd.controller';
import { EipdService } from './eipd.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EipdController],
  providers: [EipdService],
})
export class EipdModule {}
