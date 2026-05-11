import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateActivoDto {
  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  codigoActivoPadreExterno?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  activoPadreId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dependenciaId?: number;

  @IsOptional()
  @IsString()
  dependenciaNombreFuente?: string;

  @IsOptional()
  @IsString()
  siglaDependenciaFuente?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  macroproceso?: string;

  @IsOptional()
  @IsString()
  proceso?: string;

  @IsOptional()
  @IsString()
  subproceso?: string;

  @IsOptional()
  @IsString()
  usoOtrasAreasProcesos?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tipoActivoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  nivelId?: number;

  @IsOptional()
  @IsString()
  direccionIpUrl?: string;

  @IsOptional()
  @IsString()
  propietarioActivo?: string;

  @IsOptional()
  @IsString()
  unidadPropietariaActivo?: string;

  @IsOptional()
  @IsString()
  custodio?: string;

  @IsOptional()
  @IsString()
  areaCustodio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ambienteId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clasificacionInfoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  datosPersonalesId?: number;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  visibleInternetId?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(4)
  confidencialidad?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(4)
  integridad?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(4)
  disponibilidad?: number;

  @IsOptional()
  @IsDateString()
  fechaLevantamiento?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  fuenteActivoId?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fuentesUsuarios?: string[];

  @IsOptional()
  @IsString()
  controlesExistentes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bajaProgramadaId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  propiedadIntelectualId?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  historico?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
