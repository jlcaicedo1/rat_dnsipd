import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CatalogosController } from "./catalogos.controller";
import { CatalogosService } from "./catalogos.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CatalogosController],
  providers: [CatalogosService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
