import { Module } from "@nestjs/common";
import { DependenciaController } from "./dependencia.controller";
import { DependenciaService } from "./dependencia.service";
import { SubdireccionController } from "./subdireccion.controller";
import { SubdireccionService } from "./subdireccion.service";
import { TipoProcesoController } from "./tipo-proceso.controller";
import { TipoProcesoService } from "./tipo-proceso.service";

@Module({
  controllers: [
    TipoProcesoController,
    DependenciaController,
    SubdireccionController,
  ],
  providers: [TipoProcesoService, DependenciaService, SubdireccionService],
  exports: [TipoProcesoService, DependenciaService, SubdireccionService],
})
export class EstructuraOrganicaModule {}
