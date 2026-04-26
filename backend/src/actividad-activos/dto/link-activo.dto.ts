import { IsInt } from 'class-validator';

export class LinkActivoDto {
  @IsInt()
  activoId!: number;
}
