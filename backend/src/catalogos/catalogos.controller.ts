import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/authenticated-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CatalogosService } from "./catalogos.service";
import { CreateCatalogoDto } from "./dto/create-catalogo.dto";
import { QueryCatalogoDto } from "./dto/query-catalogo.dto";
import { UpdateCatalogoDto } from "./dto/update-catalogo.dto";

@Controller("catalogos")
@UseGuards(JwtAuthGuard)
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get()
  findAll(@Query() query: QueryCatalogoDto) {
    return this.catalogosService.findAll(query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCatalogoDto,
  ) {
    return this.catalogosService.create(dto, user);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCatalogoDto,
  ) {
    return this.catalogosService.update(id, dto, user);
  }
}
