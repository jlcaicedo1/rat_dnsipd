import { Controller, Get } from "@nestjs/common";
import { TipoProcesoService } from "./tipo-proceso.service";

@Controller("tipo-proceso")
export class TipoProcesoController {
  constructor(private readonly tipoProcesoService: TipoProcesoService) {}

  @Get()
  findAll() {
    return this.tipoProcesoService.findAll();
  }
}
