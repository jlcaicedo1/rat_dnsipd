import { IsOptional, IsString } from 'class-validator';

export class UpsertChecklistDpdDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  formData?: Record<string, string>;

  @IsOptional()
  controles?: unknown;

  @IsOptional()
  planRows?: unknown[];
}
