import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MtgeService } from './mtge.service';
import { CalculateMtgeDto } from './dto/calculate-mtge.dto';

@Controller()
export class MtgeController {
  constructor(private readonly mtgeService: MtgeService) {}

  @Get('actividad-versiones/:actividadVersionId/mtge')
  findOne(@Param('actividadVersionId', ParseIntPipe) actividadVersionId: number) {
    return this.mtgeService.findOne(actividadVersionId);
  }

  @Post('actividad-versiones/:actividadVersionId/mtge/calculate')
  @UseGuards(JwtAuthGuard)
  calculate(
    @Param('actividadVersionId', ParseIntPipe) actividadVersionId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CalculateMtgeDto,
  ) {
    return this.mtgeService.calculate(actividadVersionId, dto, user);
  }

  @Delete('actividad-versiones/:actividadVersionId/mtge')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('actividadVersionId', ParseIntPipe) actividadVersionId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mtgeService.remove(actividadVersionId, user);
  }
}
