import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CatalogosModule } from "./catalogos/catalogos.module";
import { EstructuraOrganicaModule } from "./estructura-organica/estructura-organica.module";
import { RatModule } from "./rat/rat.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CatalogosModule,
    EstructuraOrganicaModule,
    RatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
