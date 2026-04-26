import { Controller, Get } from "@nestjs/common";
import { SubdireccionService } from "./subdireccion.service";

@Controller("subdirecciones")
export class SubdireccionController {
  constructor(private readonly subdireccionService: SubdireccionService) {}

  @Get()
  findAll() {
    return this.subdireccionService.findAll();
  }
}
