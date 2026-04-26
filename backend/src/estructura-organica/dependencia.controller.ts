import { Controller, Get } from "@nestjs/common";
import { DependenciaService } from "./dependencia.service";

@Controller("dependencias")
export class DependenciaController {
  constructor(private readonly dependenciaService: DependenciaService) {}

  @Get()
  findAll() {
    return this.dependenciaService.findAll();
  }
}
