import { IsEmail, IsInt, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @IsString()
  nombre!: string;

  @IsEmail()
  email!: string;

  @IsString()
  username!: string;

  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsInt()
  dependenciaId?: number;

  @IsOptional()
  @IsInt()
  subdireccionId?: number;
}
