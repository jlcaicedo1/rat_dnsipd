import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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

  @Get("tree")
  findTree(@Query() query: QueryCatalogoDto) {
    return this.catalogosService.findTree(query);
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

  @Delete(":id")
  delete(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogosService.delete(id, user);
  }

  // ─── CatalogoRelacion endpoints ────────────────────────────────────────────

  @Get("relaciones")
  findRelaciones(
    @Query("origenId") origenId?: string,
    @Query("tipo") tipo?: string,
  ) {
    return this.catalogosService.findRelaciones(
      origenId ? parseInt(origenId, 10) : undefined,
      tipo,
    );
  }

  @Post("relaciones")
  createRelacion(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { origenId: number; destinoId: number; tipo: string; orden?: number },
  ) {
    return this.catalogosService.createRelacion(body, user);
  }

  @Delete("relaciones/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRelacion(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogosService.deleteRelacion(id, user);
  }

  @Patch("relaciones/:id/toggle-activo")
  toggleRelacionActivo(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogosService.toggleRelacionActivo(id, user);
  }
}
