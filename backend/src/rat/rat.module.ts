import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RatController } from "./rat.controller";
import { RatService } from "./rat.service";

@Module({
  imports: [AuthModule],
  controllers: [RatController],
  providers: [RatService],
  exports: [RatService],
})
export class RatModule {}
