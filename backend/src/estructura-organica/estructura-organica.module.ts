import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DependenciasController } from "./dependencias.controller";
import { DependenciasService } from "./dependencias.service";
import { SubdireccionesController } from "./subdirecciones.controller";
import { SubdireccionesService } from "./subdirecciones.service";
import { TipoProcesoController } from "./tipo-proceso.controller";
import { TipoProcesoService } from "./tipo-proceso.service";

@Module({
  imports: [AuthModule],
  controllers: [
    TipoProcesoController,
    DependenciasController,
    SubdireccionesController,
  ],
  providers: [TipoProcesoService, DependenciasService, SubdireccionesService],
  exports: [TipoProcesoService, DependenciasService, SubdireccionesService],
})
export class EstructuraOrganicaModule {}
