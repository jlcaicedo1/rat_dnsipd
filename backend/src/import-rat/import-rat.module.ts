import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImportRatController } from './import-rat.controller';
import { ImportRatService } from './import-rat.service';

@Module({
  imports: [PrismaModule],
  controllers: [ImportRatController],
  providers: [ImportRatService],
})
export class ImportRatModule {}
