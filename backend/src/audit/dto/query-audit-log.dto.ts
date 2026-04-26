import { IsOptional, IsString } from 'class-validator';

export class QueryAuditLogDto {
  @IsOptional()
  @IsString()
  modulo?: string;

  @IsOptional()
  @IsString()
  entidad?: string;

  @IsOptional()
  @IsString()
  entidadId?: string;

  @IsOptional()
  @IsString()
  accion?: string;

  @IsOptional()
  @IsString()
  actor?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
