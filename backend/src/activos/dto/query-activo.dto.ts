import { IsOptional, IsString } from 'class-validator';

export class QueryActivoDto {
  @IsOptional()
  @IsString()
  search?: string;
}
