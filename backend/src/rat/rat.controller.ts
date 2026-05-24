import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/authenticated-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateRatDto } from "./dto/create-rat.dto";
import { QueryRatDto } from "./dto/query-rat.dto";
import { RatService } from "./rat.service";

@Controller("rats")
@UseGuards(JwtAuthGuard)
export class RatController {
  constructor(private readonly ratService: RatService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryRatDto,
  ) {
    return this.ratService.findAll(query, user);
  }

  @Get(":id")
  findOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ratService.findOne(id, user);
  }

  @Post()
  create(
    @Body() dto: CreateRatDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ratService.create(dto, user);
  }
}
