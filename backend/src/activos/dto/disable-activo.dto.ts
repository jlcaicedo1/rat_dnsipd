import { IsOptional, IsString } from 'class-validator';

export class DisableActivoDto {
  @IsOptional()
  @IsString()
  motivo?: string;
}
