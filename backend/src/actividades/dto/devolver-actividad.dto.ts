import { IsString } from 'class-validator';

export class DevolverActividadDto {
  @IsString()
  motivo!: string;
}
