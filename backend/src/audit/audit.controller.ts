import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationScopeService } from '../auth/authorization-scope.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly authz: AuthorizationScopeService,
  ) {}

  @Get('audit-logs')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryAuditLogDto,
  ) {
    this.authz.assertCanViewAudit(user);
    return this.auditService.findAll(query);
  }

  @Get('audit-logs/:id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.authz.assertCanViewAudit(user);
    return this.auditService.findOne(id);
  }
}
