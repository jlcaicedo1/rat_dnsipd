import { IsOptional, IsString } from 'class-validator';

export class UpsertEipdFormDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  formFields?: Record<string, string>;

  @IsOptional()
  s2State?: unknown[];

  @IsOptional()
  s3State?: unknown[];

  @IsOptional()
  datosRows?: unknown[];

  @IsOptional()
  activosRows?: unknown[];

  @IsOptional()
  s4Rows?: unknown[];

  @IsOptional()
  s5Rows?: unknown[];

  @IsOptional()
  s6Rows?: unknown[];
}
