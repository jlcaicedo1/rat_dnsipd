import { Controller, Get, Query } from "@nestjs/common";
import { CatalogosService } from "./catalogos.service";

@Controller("catalogos")
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get()
  findAll(@Query("tipo") tipo?: string) {
    return this.catalogosService.findAll(tipo);
  }
}
