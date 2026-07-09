import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ChecklistDpdController } from './checklist-dpd.controller';
import { ChecklistDpdService } from './checklist-dpd.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ChecklistDpdController],
  providers: [ChecklistDpdService],
})
export class ChecklistDpdModule {}
