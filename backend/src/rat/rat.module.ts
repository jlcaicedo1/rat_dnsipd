import { Module } from "@nestjs/common";
import { RatController } from "./rat.controller";
import { RatService } from "./rat.service";

@Module({
  controllers: [RatController],
  providers: [RatService],
  exports: [RatService],
})
export class RatModule {}
