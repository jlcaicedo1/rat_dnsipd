import { Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  listar(@CurrentUser() user: AuthenticatedUser) {
    return this.notificacionesService.listar(user);
  }

  @Get('no-leidas/count')
  contarNoLeidas(@CurrentUser() user: AuthenticatedUser) {
    return this.notificacionesService.contarNoLeidas(user);
  }

  @Patch(':id/leer')
  marcarLeida(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificacionesService.marcarLeida(id, user);
  }

  @Patch('leer-todas')
  marcarTodasLeidas(@CurrentUser() user: AuthenticatedUser) {
    return this.notificacionesService.marcarTodasLeidas(user);
  }
}
