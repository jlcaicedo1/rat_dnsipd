import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateEipdDto } from './dto/create-eipd.dto';
import { UpdateEipdDto } from './dto/update-eipd.dto';
import { EipdService } from './eipd.service';

@Controller()
export class EipdController {
  constructor(private readonly eipdService: EipdService) {}

  @Get('actividad-versiones/:actividadVersionId/eipd')
  findByActividadVersion(
    @Param('actividadVersionId', ParseIntPipe) actividadVersionId: number,
  ) {
    return this.eipdService.findByActividadVersion(actividadVersionId);
  }

  @Post('actividad-versiones/:actividadVersionId/eipd')
  @UseGuards(JwtAuthGuard)
  create(
    @Param('actividadVersionId', ParseIntPipe) actividadVersionId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEipdDto,
  ) {
    return this.eipdService.create(actividadVersionId, dto, user);
  }

  @Get('eipd/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eipdService.findOne(id);
  }

  @Patch('eipd/:id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateEipdDto,
  ) {
    return this.eipdService.update(id, dto, user);
  }

  @Delete('eipd/:id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eipdService.remove(id, user);
  }
}
