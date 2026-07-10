import { IsString } from 'class-validator';

export class ApproveActividadDto {
  @IsString()
  motivo!: string;
}
