import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreateRatDto } from "./dto/create-rat.dto";
import { RatService } from "./rat.service";

@Controller("rats")
export class RatController {
  constructor(private readonly ratService: RatService) {}

  @Get()
  findAll() {
    return this.ratService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.ratService.findOne(Number(id));
  }

  @Post()
  create(@Body() dto: CreateRatDto) {
    return this.ratService.create(dto);
  }
}
