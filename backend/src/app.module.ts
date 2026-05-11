import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ActivosModule } from "./activos/activos.module";
import { AuditModule } from "./audit/audit.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CatalogosModule } from "./catalogos/catalogos.module";
import { EstructuraOrganicaModule } from "./estructura-organica/estructura-organica.module";
import { RatModule } from "./rat/rat.module";
import { ActividadesModule } from "./actividades/actividades.module";
import { ActividadActivosModule } from "./actividad-activos/actividad-activos.module";
import { ActividadVersionesModule } from "./actividad-versiones/actividad-versiones.module";
import { EipdModule } from "./eipd/eipd.module";
import { RiesgosModule } from "./riesgos/riesgos.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    CatalogosModule,
    EstructuraOrganicaModule,
    RatModule,
    ActividadesModule,
    ActividadVersionesModule,
    ActividadActivosModule,
    RiesgosModule,
    EipdModule,
    ActivosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
