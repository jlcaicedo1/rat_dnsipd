import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TipoProcesoService } from "./tipo-proceso.service";

@Controller("tipo-proceso")
@UseGuards(JwtAuthGuard)
export class TipoProcesoController {
  constructor(private readonly tipoProcesoService: TipoProcesoService) {}

  @Get()
  findAll() {
    return this.tipoProcesoService.findAll();
  }
}
